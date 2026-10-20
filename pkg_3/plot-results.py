from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
root=Path(__file__).resolve().parent
report=json.loads((root/'analysis/results.json').read_text())
titles={'low':'Малоконтрастное изображение','color':'Эквализация цветного изображения','noise':'Сглаживание гауссова шума','impulse':'Сглаживание импульсного шума','uneven':'Неравномерное освещение'}
labels={'linear':'Линейное растяжение V','hsv':'Эквализация V (HSV)','rgb':'Эквализация RGB','clahe':'CLAHE, окно 33 × 33','box':'Бокс-фильтр 5 × 5','gaussian':'Гаусс 5 × 5, σ = 1,4'}
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
for case in report['cases']:
 kind=case['sample'];entries=[('Исходное',root/f'samples/{kind}.png',case['histBefore'],case['before'])]
 entries += [(labels[m['method']],root/f"analysis/{kind}-{m['method']}.png",m['histogram'],m['metrics']) for m in case['methods']]
 fig,axes=plt.subplots(2,len(entries),figsize=(len(entries)*3.8,5.8),gridspec_kw={'height_ratios':[1.3,1]},layout='constrained')
 fig.suptitle(titles[kind],fontsize=17,fontweight='bold',color='#163e40')
 ymax=max(max(entry[2]) for entry in entries)*1.08
 for col,(label,image,hist,metrics) in enumerate(entries):
  axes[0,col].imshow(mpimg.imread(image));axes[0,col].set_title(label,fontsize=11,pad=9);axes[0,col].axis('off')
  ax=axes[1,col];ax.bar(range(256),hist,width=1,color='#2b8270');ax.set_xlim(0,255);ax.set_ylim(0,ymax);ax.set_xticks([0,64,128,192,255]);ax.set_xlabel('Яркость Y′');ax.grid(axis='y',alpha=.2);ax.set_axisbelow(True);ax.ticklabel_format(axis='y',style='sci',scilimits=(0,0));ax.set_title(f"μ = {metrics['mean']:.2f}; σ = {metrics['std']:.2f}; H = {metrics['entropy']:.2f}",fontsize=9)
  if col==0:ax.set_ylabel('Число пикселей')
 fig.savefig(root/f'analysis/{kind}-comparison.png',dpi=150,facecolor='#f7fbf8');plt.close(fig)
print('Пять сравнений изображений и гистограмм созданы')
